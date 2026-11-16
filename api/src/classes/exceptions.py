class NBADataError(Exception):
    def __init__(self, status_code, message):
        super().__init__(message)
        self.status_code = status_code
        self.message = message


class PlayerNotFoundError(NBADataError):
    def __init__(self):
        super().__init__(404, "player id not found")


class InvalidPlayerIdError(NBADataError):
    def __init__(self):
        super().__init__(400, "invalid player id")
