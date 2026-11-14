from dataclasses import dataclass


@dataclass
class AveragesStatSet:
    playerId: int
    seasonId: str
    teamId: str
    teamAbv: str
    gp: int
    pts: float
    reb: float
    ast: float
    stl: float
    blk: float
    fgPct: float
    fg3Pct: float
    ftPct: float

    @classmethod
    def from_api_res(cls, res):
        return cls(
            res.get("PLAYER_ID"),
            res.get("SEASON_ID"),
            res.get("TEAM_ID"),
            res.get("TEAM_ABBREVIATION"),
            res.get("GP"),
            res.get("PTS"),
            res.get("REB"),
            res.get("AST"),
            res.get("STL"),
            res.get("BLK"),
            res.get("FG_PCT"),
            res.get("FG3_PCT"),
            res.get("FT_PCT"),
        )

    def to_json(self):
        return {
            "seasonId": self.seasonId,
            "teamId": self.teamId,
            "teamAbv": self.teamAbv,
            "gp": self.gp,
            "pts": self.pts,
            "reb": self.reb,
            "ast": self.ast,
            "stl": self.stl,
            "blk": self.blk,
            "fgPct": self.fgPct,
            "fg3Pct": self.fg3Pct,
            "ftPct": self.ftPct,
        }
