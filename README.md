# என் பண்ணை · My Farm: putting the app online (Step 7)

This folder is the whole website. GitHub Pages hosts it for free, and GitHub Actions refreshes the weather twice a day (about 5:15 AM and 5:15 PM India time). Your father opens one link and adds it to his home screen. No PC needs to stay on.

## What's in here

| File | Purpose |
| --- | --- |
| index.html | The app (Tamil default, EN toggle) |
| manifest.webmanifest, icons/ | Home-screen icon and app name |
| sw.js | Lets the app open with no internet, showing the last data |
| data/*.json | Farm, weather and soil data |
| weather.py, requirements.txt | Weather refresh, run by GitHub |
| update-weather.yml | The twice-daily schedule (goes into `.github/workflows/` on GitHub, see step 4) |

## One-time setup (about 15 minutes)

1. Sign in or sign up at github.com (free).
2. Click **+ → New repository**. Name it `my-farm`, choose **Public**, then **Create repository**.
   - Free Pages sites need a public repository. Anyone with the link can see the farm's location, soil results and forecast, but there's no money data: Money tab entries stay only on the phone.
3. On the new repository page, click **uploading an existing file**. Drag in everything from this folder **except** `update-weather.yml`, then click **Commit changes**.
4. Add the schedule file: click **Add file → Create new file**, type the name `.github/workflows/update-weather.yml`, open `update-weather.yml` from this folder in VS Code or Notepad and paste in its contents, then click **Commit changes**.
5. Go to **Settings → Actions → General → Workflow permissions**, choose **Read and write permissions**, then **Save**.
6. Go to **Settings → Pages**. Under Source choose **Deploy from a branch**, branch **main**, folder **/ (root)**, then **Save**. After 1 to 2 minutes the address appears, e.g. `https://YOUR-NAME.github.io/my-farm/`.
7. Go to **Actions → Update weather → Run workflow** to test it. In about a minute a new commit "Update weather …" appears, and the app shows fresh weather.

## On your father's phone

- **Android (Chrome):** open the link, tap **⋮ → Add to Home screen / Install app**.
- **iPhone (Safari):** open the link, tap **Share → Add to Home Screen**.

The icon is a green square with a sprout and a raindrop, named என் பண்ணை.

## Updating later

- **New satellite or soil data:** run `python farm_data.py` on your PC as before. Then on GitHub open the `data` folder, choose **Add file → Upload files**, drop in the new `farm_data.json` or `soil.json`, and commit.
- **Changing index.html:** upload the new file the same way. Also open `sw.js` and change `fi-v1` to `fi-v2` (and so on), so phones pick up the new version. Phones update the next time the app is opened with internet. Sometimes it takes a second opening.

## If something looks wrong

- **Yellow "weather data is old" banner:** open the repository's **Actions** tab. If the workflow failed, open it to see why and press **Run workflow** again. GitHub can pause scheduled workflows in repositories with no activity for 60 days. If it says the workflow is disabled, click **Enable workflow**.
- **The Money tab is empty on a new phone:** entries are saved only in that phone's browser. Clearing browser data erases them.
- Weather is a model forecast for a ~10 km grid. For cyclone or heavy-rain warnings, follow IMD Chennai.
