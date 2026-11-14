from nba_api.stats.endpoints.playercareerstats import PlayerCareerStats

PER_MODE = "PerGame"


def get_player_stats(player_id):
    stats = PlayerCareerStats(player_id, PER_MODE)
    return stats.get_normalized_dict()["SeasonTotalsRegularSeason"]
