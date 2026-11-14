from dataclasses import dataclass


@dataclass
class Player:
    playerId: int
    firstName: str
    lastName: str
    fullName: str
    isActive: bool

    @classmethod
    def from_api_resp(cls, res):
        return cls(
            res["id"],
            res["first_name"],
            res["last_name"],
            res["full_name"],
            res["is_active"],
        )

    def to_json(self):
        return {
            "playerId": self.playerId,
            "firstName": self.firstName,
            "lastName": self.lastName,
            "fullName": self.fullName,
            "isActive": self.isActive,
        }
