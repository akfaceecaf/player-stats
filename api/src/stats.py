from json.decoder import JSONDecodeError

from nba_api.stats.endpoints.playercareerstats import PlayerCareerStats

from .classes.exceptions import InvalidPlayerIdError, PlayerNotFoundError

PER_MODE = "PerGame"

DATASETS = ["SeasonTotalsRegularSeason", "SeasonTotalsPostSeason"]


def get_player_stats(player_id):
    try:
        res = PlayerCareerStats(player_id, PER_MODE)
    except KeyError:
        raise PlayerNotFoundError()
    except JSONDecodeError:
        raise InvalidPlayerIdError()
    data = res.get_normalized_dict()
    return {k: data[k] for k in DATASETS}
