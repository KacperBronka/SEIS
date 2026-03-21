export function getAgeFromPESEL(pesel) {
    if (!/^\d{11}$/.test(pesel)) {
        throw new Error("Nieprawidłowy PESEL");
    }

    let year = parseInt(pesel.substring(0, 2), 10);
    let month = parseInt(pesel.substring(2, 4), 10);
    let day = parseInt(pesel.substring(4, 6), 10);

    let century = 1900;

    if (month >= 1 && month <= 12) {
        century = 1900;
    } else if (month >= 21 && month <= 32) {
        century = 2000;
        month -= 20;
    } else if (month >= 41 && month <= 52) {
        century = 2100;
        month -= 40;
    } else if (month >= 61 && month <= 72) {
        century = 2200;
        month -= 60;
    } else if (month >= 81 && month <= 92) {
        century = 1800;
        month -= 80;
    } else {
        throw new Error("Nieprawidłowy miesiąc w PESEL");
    }

    const fullYear = century + year;

    const birthDate = new Date(fullYear, month - 1, day);
    const today = new Date();

    let age = today.getFullYear() - fullYear;

    const hasHadBirthday =
        today.getMonth() > birthDate.getMonth() ||
        (today.getMonth() === birthDate.getMonth() &&
            today.getDate() >= birthDate.getDate());

    if (!hasHadBirthday) {
        age--;
    }

    return age;
}