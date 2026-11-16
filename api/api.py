from fastapi import FastAPI
from fastapi.responses import JSONResponse

from src.classes.exceptions import NBADataError
from src.classes.metadata import Metadata
from src.classes.player import Player
from src.classes.stat_sets import AveragesStatSet
from src.player import get_image_url, get_metadata, get_players
from src.stats import get_player_stats

app = FastAPI()


@app.get("/")
def index():
    return {"status": "ok"}


@app.exception_handler(NBADataError)
def nba_data_exception_handler(req, exc: NBADataError):
    return JSONResponse(
        {"message": f"could not fetch NBA data: {exc.message}"}, exc.status_code
    )


# fetch list of players
@app.get("/players")
def players():
    raw_players = get_players()
    players = [Player.from_api_resp(p).to_json() for p in raw_players]
    return players


@app.get("/stats/{player_id}")
def stats(player_id):
    raw_metadata = get_metadata(player_id)
    metadata = Metadata.from_api_res(raw_metadata)
    raw_stats = get_player_stats(player_id)
    stats = [AveragesStatSet.from_api_res(s).to_json() for s in raw_stats]
    image_url = get_image_url(player_id)
    return {
        "metadata": metadata.to_json(),
        "stats": stats,
        "imageUrl": image_url,
    }
