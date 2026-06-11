class CargoService:

    @staticmethod
    def calculate_volume(length: float, width: float, height: float) -> float:
        return length * width * height

    @staticmethod
    def calculate_density(weight: float, volume: float) -> float:
        return weight / volume

    @staticmethod
    def validate_transport(cargo, transport):
        errors = []

        if cargo.weight > transport.maxWeight:
            errors.append("Cargo weight exceeds transport capacity")

        if cargo.volume > transport.maxVolume:
            errors.append("Cargo volume exceeds transport capacity")

        return len(errors) == 0, errors