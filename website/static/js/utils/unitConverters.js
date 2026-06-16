
/**
 * Конвертирует dBm в dB(мкВ/м) с учетом частоты
 * @param {number} dbm - значение в dBm
 * @param {number} freqMhz - частота в МГц
 * @returns {number} значение в dB(мкВ/м)
 */
export const dbmToDbMkvM = (dbm, freqMhz) => {
    return dbm + 20 * Math.log10(freqMhz) + 77.2;
};

/**
 * Конвертирует dB(мкВ/м) в dBm с учетом частоты
 * @param {number} dbMkvM - значение в dB(мкВ/м)
 * @param {number} freqMhz - частота в МГц
 * @returns {number} значение в dBm
 */
export const dbMkvMToDbm = (dbMkvM, freqMhz) => {
    return dbMkvM - 20 * Math.log10(freqMhz) - 77.2;
};

/**
 * Конвертирует массив значений из dBm в dB(мкВ/м)
 * @param {number[]} dbmArray - массив значений в dBm
 * @param {number} freqMhz - частота в МГц
 * @returns {number[]} массив значений в dB(мкВ/м)
 */
export const dbmArrayToDbMkvM = (dbmArray, freqMhz) => {
    return dbmArray.map(dbm => dbmToDbMkvM(dbm, freqMhz));
};

/**
 * Конвертирует массив значений из dB(мкВ/м) в dBm
 * @param {number[]} dbMkvMArray - массив значений в dB(мкВ/м)
 * @param {number} freqMhz - частота в МГц
 * @returns {number[]} массив значений в dBm
 */
export const dbMkvMArrayToDbm = (dbMkvMArray, freqMhz) => {
    return dbMkvMArray.map(dbMkvM => dbMkvMToDbm(dbMkvM, freqMhz));
};