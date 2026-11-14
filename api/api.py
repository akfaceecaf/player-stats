from fastapi import FastAPI

from src.classes.Metadata import Metadata
from src.classes.Player import Player
from src.classes.AveragesStatSet import AveragesStatSet
from src.player import get_image_url, get_metadata, get_players
from src.stats import get_player_stats

app = FastAPI()


@app.get("/")
def index():
    return {"status": "ok"}


# fetch list of players
@app.get("/players")
def players():
    raw_players = get_players()
    players = [Player.from_api_resp(p).to_json() for p in raw_players]
    return players


@app.get("/stats/{player_id}")
def stats(player_id):
    try:
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
    except KeyError:
        return {"error": "invalid player id"}
