from dataclasses import dataclass


@dataclass
class Metadata:
    playerId: int
    fullName: str
    position: str
    height: str
    weight: str
    birthDate: str
    country: str
    teamId: str
    teamName: str

    @classmethod
    def from_api_res(cls, res):
        return cls(
            res["PERSON_ID"],
            res["DISPLAY_FIRST_LAST"],
            res["POSITION"],
            res["HEIGHT"],
            res["WEIGHT"],
            res["BIRTHDATE"],
            res["COUNTRY"],
            res["TEAM_ID"],
            res["TEAM_NAME"],
        )

    def to_json(self):
        return {
            "playerId": self.playerId,
            "fullName": self.fullName,
            "position": self.position,
            "height": self.height,
            "weight": self.weight,
            "birthDate": self.birthDate,
            "country": self.country,
            "teamId": self.teamId,
            "teamName": self.teamName,
        }
