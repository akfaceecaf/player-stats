from nba_api.stats.static import players as players_api

from .classes.player import Player


def get_players():
    players = players_api.get_players()
    print(f"Number of players fetched: {len(players)}")
    return players


def format_player(res: dict):
    return Player(
        res["id"],
        res["first_name"],
        res["last_name"],
        res["full_name"],
        res["is_active"],
    ).to_json()
