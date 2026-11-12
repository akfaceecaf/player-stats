from fastapi import FastAPI

from src.utils import format_player, get_players

app = FastAPI()


@app.get("/")
def index():
    return {"status": "ok"}


# fetch list of players
@app.get("/players")
def players():
    raw_players = get_players()
    players = list(map(format_player, raw_players))
    return players
