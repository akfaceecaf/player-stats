from json.decoder import JSONDecodeError

from nba_api.stats.endpoints.playercareerstats import PlayerCareerStats

from .classes.exceptions import InvalidPlayerIdError, PlayerNotFoundError

PER_MODE = "PerGame"


def get_player_stats(player_id):
    try:
        stats = PlayerCareerStats(player_id, PER_MODE)
    except KeyError:
        raise PlayerNotFoundError()
    except JSONDecodeError:
        raise InvalidPlayerIdError()
    return stats.get_normalized_dict()["SeasonTotalsRegularSeason"]
