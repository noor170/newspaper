python -m venv venv
source venv/bin/activate  # On Windows use `venv\\Scripts\\activate`


pip install -r requirements.txt


uvicorn app.main:app --reload --port 8000


cd frontend


npm install


npm run dev


git init
git add .
git commit -m "feat: initial commit of enterprise full-stack data product application infrastructure"
git branch -M main
git remote add origin <YOUR_GITHUB_REPOSITORY_URL_HERE>
git push -u origin main