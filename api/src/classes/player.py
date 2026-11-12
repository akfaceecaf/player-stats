from dataclasses import dataclass


@dataclass
class Player:
    playerId: int
    firstName: str
    lastName: str
    fullName: str
    isActive: bool

    def to_json(self):
        return {
            "playerId": self.playerId,
            "firstName": self.firstName,
            "lastName": self.lastName,
            "fullName": self.fullName,
            "isActive": self.isActive,
        }
