from __future__ import annotations

import tempfile
from datetime import date, datetime, timedelta
from pathlib import Path

import numpy as np
import pandas as pd
from sqlalchemy import select
from sqlalchemy.orm import Session

try:
    from .database import Inventory, MarketingSpend, Order
except ImportError:
    from database import Inventory, MarketingSpend, Order


def compute_dashboard_metrics(
    db: Session,
    start_date: date | None = None,
    end_date: date | None = None,
) -> dict:
    orders_df, inventory_df, marketing_df = _load_frames(db, start_date, end_date)
    return _build_dashboard_payload(orders_df, inventory_df, marketing_df, start_date, end_date)


def export_operations_report(
    db: Session,
    start_date: date | None = None,
    end_date: date | None = None,
    file_format: str = "csv",
) -> tuple[Path, str, str]:
    orders_df, inventory_df, marketing_df = _load_frames(db, start_date, end_date)
    dashboard = _build_dashboard_payload(orders_df, inventory_df, marketing_df, start_date, end_date)

    summary_rows = []
    for item in dashboard["low_stock_products"]:
        summary_rows.append(
            {
                "record_type": "low_stock_product",
                "key": item["product_name"],
                "category": item["category"],
                "value": item["days_of_inventory_left"],
                "secondary_value": item["sales_velocity_30d"],
            }
        )

    for item in dashboard["category_return_rates"]:
        summary_rows.append(
            {
                "record_type": "category_return_rate",
                "key": item["category"],
                "category": item["category"],
                "value": item["return_rate_pct"],
                "secondary_value": item["returned_orders"],
            }
        )

    kpi_rows = pd.DataFrame(
        [
            {"metric": "gross_revenue", "value": dashboard["gross_revenue"]},
            {"metric": "net_profit", "value": dashboard["net_profit"]},
            {"metric": "ad_spend", "value": dashboard["ad_spend"]},
            {"metric": "ltv_cac_ratio", "value": dashboard["ltv_cac_ratio"]},
            {"metric": "warning_count", "value": dashboard["warning_count"]},
        ]
    )

    merged_orders = _build_orders_export_frame(orders_df, inventory_df)
    summary_df = pd.DataFrame(summary_rows)

    tmp_dir = Path(tempfile.mkdtemp(prefix="ops-export-"))
    safe_start = start_date.isoformat() if start_date else "all"
    safe_end = end_date.isoformat() if end_date else "latest"

    if file_format == "xlsx":
        output_path = tmp_dir / f"operations-summary-{safe_start}-to-{safe_end}.xlsx"
        with pd.ExcelWriter(output_path, engine="openpyxl") as writer:
            merged_orders.to_excel(writer, sheet_name="orders_inventory", index=False)
            marketing_df.to_excel(writer, sheet_name="marketing_spend", index=False)
            kpi_rows.to_excel(writer, sheet_name="kpis", index=False)
            summary_df.to_excel(writer, sheet_name="alerts", index=False)
        return output_path, output_path.name, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

    output_path = tmp_dir / f"operations-summary-{safe_start}-to-{safe_end}.csv"
    csv_df = pd.concat(
        [
            merged_orders.assign(record_type="orders_inventory"),
            marketing_df.assign(record_type="marketing_spend"),
            summary_df.assign(record_type=summary_df.get("record_type", "summary")),
        ],
        ignore_index=True,
        sort=False,
    )
    csv_df.to_csv(output_path, index=False)
    return output_path, output_path.name, "text/csv"


def _load_frames(
    db: Session,
    start_date: date | None,
    end_date: date | None,
) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    order_query = select(Order)
    marketing_query = select(MarketingSpend)

    if start_date:
        order_query = order_query.where(Order.order_date >= start_date)
        marketing_query = marketing_query.where(MarketingSpend.spend_date >= start_date)
    if end_date:
        order_query = order_query.where(Order.order_date <= end_date)
        marketing_query = marketing_query.where(MarketingSpend.spend_date <= end_date)

    orders = db.execute(order_query).scalars().all()
    inventory = db.execute(select(Inventory)).scalars().all()
    marketing = db.execute(marketing_query).scalars().all()

    orders_df = pd.DataFrame(
        [
            {
                "id": row.id,
                "product_id": row.product_id,
                "sale_amount": row.sale_amount,
                "quantity": row.quantity,
                "order_date": pd.to_datetime(row.order_date),
                "is_returned": bool(row.is_returned),
            }
            for row in orders
        ]
    )
    inventory_df = pd.DataFrame(
        [
            {
                "product_id": row.product_id,
                "product_name": row.product_name,
                "category": row.category,
                "stock_level": row.stock_level,
                "cost_price": row.cost_price,
                "shipping_cost_buffer": row.shipping_cost_buffer,
            }
            for row in inventory
        ]
    )
    marketing_df = pd.DataFrame(
        [
            {
                "id": row.id,
                "spend_date": pd.to_datetime(row.spend_date),
                "ad_spend_amount": row.ad_spend_amount,
            }
            for row in marketing
        ]
    )

    if orders_df.empty:
        orders_df = pd.DataFrame(
            columns=["id", "product_id", "sale_amount", "quantity", "order_date", "is_returned"]
        )
    if inventory_df.empty:
        inventory_df = pd.DataFrame(
            columns=[
                "product_id",
                "product_name",
                "category",
                "stock_level",
                "cost_price",
                "shipping_cost_buffer",
            ]
        )
    if marketing_df.empty:
        marketing_df = pd.DataFrame(columns=["id", "spend_date", "ad_spend_amount"])

    return orders_df, inventory_df, marketing_df


def _build_dashboard_payload(
    orders_df: pd.DataFrame,
    inventory_df: pd.DataFrame,
    marketing_df: pd.DataFrame,
    start_date: date | None,
    end_date: date | None,
) -> dict:
    if inventory_df.empty:
        return _empty_payload(start_date, end_date)

    merged_orders = _build_orders_export_frame(orders_df, inventory_df)
    if merged_orders.empty:
        inventory_health = _build_inventory_health(
            pd.DataFrame(columns=["product_id", "order_date", "daily_quantity", "sales_velocity_30d"]),
            inventory_df,
        )
        return {
            "date_range": {
                "start_date": start_date.isoformat() if start_date else None,
                "end_date": end_date.isoformat() if end_date else None,
            },
            "gross_revenue": 0.0,
            "net_profit": 0.0,
            "recognized_revenue": 0.0,
            "ad_spend": round(float(marketing_df["ad_spend_amount"].sum()) if not marketing_df.empty else 0.0, 2),
            "warning_count": 0,
            "ltv_cac_ratio": 0.0,
            "ltv_cac_status": "warning",
            "category_return_rates": [],
            "low_stock_products": [],
            "inventory_overview": [
                {
                    "product_id": int(row["product_id"]),
                    "product_name": row["product_name"],
                    "category": row["category"],
                    "stock_level": int(row["stock_level"]),
                    "sales_velocity_30d": round(float(row["sales_velocity_30d"]), 2),
                    "days_of_inventory_left": None if np.isinf(row["days_of_inventory_left"]) else round(float(row["days_of_inventory_left"]), 1),
                    "critical_reorder_alert": False,
                }
                for row in inventory_health.to_dict("records")
            ],
            "time_series": {"labels": [], "gross_sales": [], "net_profit": []},
            "totals": {"orders": 0, "units_sold": 0, "returned_orders": 0},
        }
    merged_orders["recognized_revenue"] = np.where(
        merged_orders["is_returned"], 0.0, merged_orders["sale_amount"]
    )
    merged_orders["unit_cost_total"] = merged_orders["quantity"] * merged_orders["cost_price"]
    merged_orders["shipping_total"] = merged_orders["quantity"] * merged_orders["shipping_cost_buffer"]
    merged_orders["gross_margin"] = (
        merged_orders["recognized_revenue"]
        - merged_orders["unit_cost_total"]
        - merged_orders["shipping_total"]
    )

    gross_revenue = float(merged_orders["sale_amount"].sum())
    recognized_revenue = float(merged_orders["recognized_revenue"].sum())
    ad_spend = float(marketing_df["ad_spend_amount"].sum()) if not marketing_df.empty else 0.0
    net_profit = float(merged_orders["gross_margin"].sum() - ad_spend)

    daily_sales = _build_daily_sales(merged_orders)
    inventory_health = _build_inventory_health(daily_sales, inventory_df)
    low_stock_products = inventory_health[inventory_health["critical_reorder_alert"]].copy()
    low_stock_products.sort_values(["days_of_inventory_left", "stock_level"], inplace=True)

    category_return_rates = (
        merged_orders.groupby("category", dropna=False)
        .agg(
            total_orders=("id", "count"),
            returned_orders=("is_returned", "sum"),
        )
        .reset_index()
    )
    category_return_rates["return_rate_pct"] = np.where(
        category_return_rates["total_orders"] > 0,
        (category_return_rates["returned_orders"] / category_return_rates["total_orders"]) * 100,
        0.0,
    )

    time_series = _build_time_series(merged_orders, marketing_df)

    order_count = len(merged_orders.index)
    average_order_value = recognized_revenue / order_count if order_count else 0.0
    repeat_purchase_factor = (
        merged_orders["quantity"].sum() / order_count if order_count else 0.0
    )
    blended_ltv = average_order_value * (1 + min(repeat_purchase_factor, 2.5))
    estimated_cac = ad_spend / order_count if order_count and ad_spend > 0 else 0.0
    ltv_cac_ratio = blended_ltv / estimated_cac if estimated_cac > 0 else 0.0

    return {
        "date_range": {
            "start_date": (
                start_date.isoformat()
                if start_date
                else _safe_date_string(merged_orders["order_date"].min())
            ),
            "end_date": (
                end_date.isoformat()
                if end_date
                else _safe_date_string(merged_orders["order_date"].max())
            ),
        },
        "gross_revenue": round(gross_revenue, 2),
        "net_profit": round(net_profit, 2),
        "recognized_revenue": round(recognized_revenue, 2),
        "ad_spend": round(ad_spend, 2),
        "warning_count": int(low_stock_products.shape[0]),
        "ltv_cac_ratio": round(ltv_cac_ratio, 2),
        "ltv_cac_status": "warning" if ltv_cac_ratio < 3 else "healthy",
        "category_return_rates": [
            {
                "category": row["category"],
                "total_orders": int(row["total_orders"]),
                "returned_orders": int(row["returned_orders"]),
                "return_rate_pct": round(float(row["return_rate_pct"]), 2),
            }
            for row in category_return_rates.sort_values("return_rate_pct", ascending=False).to_dict("records")
        ],
        "low_stock_products": [
            {
                "product_id": int(row["product_id"]),
                "product_name": row["product_name"],
                "category": row["category"],
                "stock_level": int(row["stock_level"]),
                "sales_velocity_30d": round(float(row["sales_velocity_30d"]), 2),
                "days_of_inventory_left": round(float(row["days_of_inventory_left"]), 1),
                "critical_reorder_alert": bool(row["critical_reorder_alert"]),
            }
            for row in low_stock_products.to_dict("records")
        ],
        "inventory_overview": [
            {
                "product_id": int(row["product_id"]),
                "product_name": row["product_name"],
                "category": row["category"],
                "stock_level": int(row["stock_level"]),
                "sales_velocity_30d": round(float(row["sales_velocity_30d"]), 2),
                "days_of_inventory_left": None if np.isinf(row["days_of_inventory_left"]) else round(float(row["days_of_inventory_left"]), 1),
                "critical_reorder_alert": bool(row["critical_reorder_alert"]),
            }
            for row in inventory_health.sort_values("days_of_inventory_left").to_dict("records")
        ],
        "time_series": time_series,
        "totals": {
            "orders": int(order_count),
            "units_sold": int(merged_orders.loc[~merged_orders["is_returned"], "quantity"].sum()),
            "returned_orders": int(merged_orders["is_returned"].sum()),
        },
    }


def _build_orders_export_frame(orders_df: pd.DataFrame, inventory_df: pd.DataFrame) -> pd.DataFrame:
    if orders_df.empty:
        return pd.DataFrame(
            columns=[
                "id",
                "product_id",
                "sale_amount",
                "quantity",
                "order_date",
                "is_returned",
                "product_name",
                "category",
                "stock_level",
                "cost_price",
                "shipping_cost_buffer",
            ]
        )
    return orders_df.merge(inventory_df, on="product_id", how="left")


def _build_daily_sales(merged_orders: pd.DataFrame) -> pd.DataFrame:
    if merged_orders.empty:
        return pd.DataFrame(columns=["product_id", "order_date", "daily_quantity", "sales_velocity_30d"])

    sales_only = merged_orders.loc[~merged_orders["is_returned"]].copy()
    daily_sales = (
        sales_only.groupby(["product_id", "order_date"], as_index=False)["quantity"]
        .sum()
        .rename(columns={"quantity": "daily_quantity"})
        .sort_values(["product_id", "order_date"])
    )
    daily_sales["sales_velocity_30d"] = (
        daily_sales.groupby("product_id")["daily_quantity"]
        .transform(lambda series: series.rolling(window=30, min_periods=1).sum() / 30.0)
    )
    return daily_sales


def _build_inventory_health(daily_sales: pd.DataFrame, inventory_df: pd.DataFrame) -> pd.DataFrame:
    latest_velocity = (
        daily_sales.sort_values(["product_id", "order_date"])
        .groupby("product_id", as_index=False)
        .tail(1)[["product_id", "sales_velocity_30d"]]
        if not daily_sales.empty
        else pd.DataFrame(columns=["product_id", "sales_velocity_30d"])
    )
    inventory_health = inventory_df.merge(latest_velocity, on="product_id", how="left")
    inventory_health["sales_velocity_30d"] = inventory_health["sales_velocity_30d"].fillna(0.0)
    inventory_health["days_of_inventory_left"] = np.where(
        inventory_health["sales_velocity_30d"] > 0,
        inventory_health["stock_level"] / inventory_health["sales_velocity_30d"],
        np.inf,
    )
    inventory_health["critical_reorder_alert"] = np.where(
        inventory_health["days_of_inventory_left"] < 15,
        True,
        False,
    )
    return inventory_health


def _build_time_series(merged_orders: pd.DataFrame, marketing_df: pd.DataFrame) -> dict:
    if merged_orders.empty:
        return {"labels": [], "gross_sales": [], "net_profit": []}

    sales_daily = (
        merged_orders.groupby("order_date", as_index=False)
        .agg(
            gross_sales=("sale_amount", "sum"),
            recognized_revenue=("recognized_revenue", "sum"),
            unit_cost_total=("unit_cost_total", "sum"),
            shipping_total=("shipping_total", "sum"),
        )
        .sort_values("order_date")
    )
    marketing_daily = (
        marketing_df.groupby("spend_date", as_index=False)["ad_spend_amount"].sum()
        if not marketing_df.empty
        else pd.DataFrame(columns=["spend_date", "ad_spend_amount"])
    )
    time_series = sales_daily.merge(
        marketing_daily,
        left_on="order_date",
        right_on="spend_date",
        how="left",
    )
    time_series["ad_spend_amount"] = time_series["ad_spend_amount"].fillna(0.0)
    time_series["net_profit"] = (
        time_series["recognized_revenue"]
        - time_series["unit_cost_total"]
        - time_series["shipping_total"]
        - time_series["ad_spend_amount"]
    )

    grouped = (
        time_series.assign(period=time_series["order_date"].dt.to_period("W").dt.start_time.dt.strftime("%b %d"))
        .groupby("period", as_index=False)[["gross_sales", "net_profit"]]
        .sum()
    )

    return {
        "labels": grouped["period"].tolist(),
        "gross_sales": [round(float(value), 2) for value in grouped["gross_sales"].tolist()],
        "net_profit": [round(float(value), 2) for value in grouped["net_profit"].tolist()],
    }


def _safe_date_string(value) -> str | None:
    if pd.isna(value):
        return None
    if isinstance(value, pd.Timestamp):
        return value.date().isoformat()
    if isinstance(value, datetime):
        return value.date().isoformat()
    if isinstance(value, date):
        return value.isoformat()
    return str(value)


def _empty_payload(start_date: date | None, end_date: date | None) -> dict:
    return {
        "date_range": {
            "start_date": start_date.isoformat() if start_date else None,
            "end_date": end_date.isoformat() if end_date else None,
        },
        "gross_revenue": 0.0,
        "net_profit": 0.0,
        "recognized_revenue": 0.0,
        "ad_spend": 0.0,
        "warning_count": 0,
        "ltv_cac_ratio": 0.0,
        "ltv_cac_status": "warning",
        "category_return_rates": [],
        "low_stock_products": [],
        "inventory_overview": [],
        "time_series": {"labels": [], "gross_sales": [], "net_profit": []},
        "totals": {"orders": 0, "units_sold": 0, "returned_orders": 0},
    }
