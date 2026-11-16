from json.decoder import JSONDecodeError

from nba_api.stats.endpoints.commonplayerinfo import CommonPlayerInfo
from nba_api.stats.static import players as players_api

from .classes.exceptions import InvalidPlayerIdError, PlayerNotFoundError

NBA_IMAGE_URL = "https://cdn.nba.com/headshots/nba/latest"
IMAGE_DIM = "260x190"


def get_players():
    players = players_api.get_players()
    print(f"Number of players fetched: {len(players)}")
    return players


def get_metadata(player_id):
    try:
        resp = CommonPlayerInfo(player_id)
    except KeyError:
        raise PlayerNotFoundError()
    except JSONDecodeError:
        raise InvalidPlayerIdError()
    return resp.get_normalized_dict()["CommonPlayerInfo"][0]


def get_image_url(player_id):
    return f"{NBA_IMAGE_URL}/{IMAGE_DIM}/{player_id}.png"
