// static/js/api/dbApi.js
import configApi from './configDbApi.js';
import DB_ENDPOINTS from './endpoints.js';

// Полная реализация BSON
class SimpleBSON {
    static serialize(obj) {
        const buffer = [];

        const writeInt32 = (value) => {
            buffer.push(value & 0xFF);
            buffer.push((value >> 8) & 0xFF);
            buffer.push((value >> 16) & 0xFF);
            buffer.push((value >> 24) & 0xFF);
        };

        const writeDouble = (value) => {
            const buffer2 = new ArrayBuffer(8);
            const view = new DataView(buffer2);
            view.setFloat64(0, value, true);
            for (let i = 0; i < 8; i++) {
                buffer.push(view.getUint8(i));
            }
        };

        const writeCString = (str) => {
            for (let i = 0; i < str.length; i++) {
                buffer.push(str.charCodeAt(i));
            }
            buffer.push(0);
        };

        const writeInt32At = (position, value) => {
            buffer[position] = value & 0xFF;
            buffer[position + 1] = (value >> 8) & 0xFF;
            buffer[position + 2] = (value >> 16) & 0xFF;
            buffer[position + 3] = (value >> 24) & 0xFF;
        };

        const encodeValue = (value) => {
            if (typeof value === 'number') {
                if (Number.isInteger(value) && value >= -2147483648 && value <= 2147483647) {
                    buffer.push(0x10);
                    return (val) => writeInt32(val);
                } else {
                    buffer.push(0x01);
                    return (val) => writeDouble(val);
                }
            } else if (typeof value === 'string') {
                buffer.push(0x02);
                const strBytes = [];
                for (let i = 0; i < value.length; i++) {
                    strBytes.push(value.charCodeAt(i));
                }
                const strLen = strBytes.length + 1;
                return (val) => {
                    writeInt32(strLen);
                    for (let i = 0; i < strBytes.length; i++) {
                        buffer.push(strBytes[i]);
                    }
                    buffer.push(0);
                };
            } else if (typeof value === 'boolean') {
                buffer.push(0x08);
                return (val) => buffer.push(val ? 1 : 0);
            } else if (value === null) {
                buffer.push(0x0A);
                return () => {};
            } else if (typeof value === 'object') {
                if (Array.isArray(value)) {
                    buffer.push(0x04);
                    return (val) => {
                        const startPos = buffer.length;
                        writeInt32(0);
                        for (let i = 0; i < val.length; i++) {
                            buffer.push(0x10);
                            writeCString(i.toString());
                            writeInt32(val[i]);
                        }
                        buffer.push(0x00);
                        const endPos = buffer.length;
                        writeInt32At(startPos, endPos - startPos);
                    };
                } else {
                    buffer.push(0x03);
                    return (val) => {
                        const embedded = SimpleBSON.serialize(val);
                        for (let i = 0; i < embedded.length; i++) {
                            buffer.push(embedded[i]);
                        }
                    };
                }
            }
            throw new Error(`Unsupported type: ${typeof value}`);
        };

        const startPos = buffer.length;
        writeInt32(0);

        for (const [key, value] of Object.entries(obj)) {
            const writer = encodeValue(value);
            writeCString(key);
            writer(value);
        }

        buffer.push(0x00);
        const endPos = buffer.length;
        writeInt32At(startPos, endPos - startPos);

        return new Uint8Array(buffer);
    }

    static deserialize(uint8Array) {
        let offset = 0;

        const readInt32 = () => {
            const value = uint8Array[offset] |
                (uint8Array[offset + 1] << 8) |
                (uint8Array[offset + 2] << 16) |
                (uint8Array[offset + 3] << 24);
            offset += 4;
            return value;
        };

        const readDouble = () => {
            const buffer = new ArrayBuffer(8);
            const view = new DataView(buffer);
            for (let i = 0; i < 8; i++) {
                view.setUint8(i, uint8Array[offset + i]);
            }
            offset += 8;
            return view.getFloat64(0, true);
        };

        const readCString = () => {
            let str = '';
            while (offset < uint8Array.length && uint8Array[offset] !== 0) {
                str += String.fromCharCode(uint8Array[offset]);
                offset++;
            }
            offset++;
            return str;
        };

        const readString = () => {
            const length = readInt32();
            let str = '';
            for (let i = 0; i < length - 1; i++) {
                str += String.fromCharCode(uint8Array[offset + i]);
            }
            offset += length;
            return str;
        };

        const readValue = (type) => {
            switch (type) {
                case 0x01: return readDouble();
                case 0x02: return readString();
                case 0x03: return readDocument();
                case 0x04: return readArray();
                case 0x08: return uint8Array[offset++] === 1;
                case 0x0A: return null;
                case 0x10: return readInt32();
                default:
                    console.warn(`Unknown BSON type: 0x${type.toString(16)}`);
                    return null;
            }
        };

        const readDocument = () => {
            const size = readInt32();
            const endPos = offset + size - 4;
            const obj = {};

            while (offset < endPos && offset < uint8Array.length) {
                const type = uint8Array[offset++];
                if (type === 0x00) break;

                const key = readCString();
                obj[key] = readValue(type);
            }

            return obj;
        };

        const readArray = () => {
            const size = readInt32();
            const endPos = offset + size - 4;
            const arr = [];
            let index = 0;

            while (offset < endPos && offset < uint8Array.length) {
                const type = uint8Array[offset++];
                if (type === 0x00) break;

                const key = readCString();
                const value = readValue(type);
                const idx = parseInt(key, 10);
                arr[idx] = value;
                index++;
            }

            return arr;
        };

        return readDocument();
    }
}

const dbApi = {
    async situation(body) {
        try {
            const response = await fetch(`${configApi.baseUrl}${DB_ENDPOINTS.SITUATION}`, {
                method: 'POST',
                headers: configApi.headers,
                body: JSON.stringify(body)
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            return response.json();
        } catch (error) {
            console.error('Error in situation:', error);
            throw error;
        }
    },

    async getNewRssTask(body) {
        try {
            const response = await fetch(`${configApi.baseUrl}${DB_ENDPOINTS.NEW_RSS_TASK}`, {
                method: 'POST',
                headers: configApi.headers,
                body: JSON.stringify(body)
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            return response.json();
        } catch (error) {
            console.error('Error in getNewRssTask:', error);
            throw error;
        }
    },

    async getStatusRssTask(body) {
        try {
            const response = await fetch(`${configApi.baseUrl}${DB_ENDPOINTS.GET_STATUS_RSS_TASK}`, {
                method: 'POST',
                headers: configApi.headers,
                body: JSON.stringify(body)
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            return response.json();
        } catch (error) {
            console.error('Error in getStatusRssTask:', error);
            throw error;
        }
    },

    async postSpectrum(body) {
        try {
            const bsonData = SimpleBSON.serialize(body);
            console.log('📤 Sending BSON data, size:', bsonData.length);
            console.log('📤 First 20 bytes:', Array.from(bsonData.slice(0, 20)));

            const response = await fetch(`${configApi.baseUrl}${DB_ENDPOINTS.SPECTRUM}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/bson'
                },
                body: bsonData
            });

            console.log('📥 Response status:', response.status);
            console.log('📥 Response headers:', Object.fromEntries(response.headers.entries()));

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Response error:', response.status, errorText);
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const arrayBuffer = await response.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);

            console.log('📥 Received data size:', uint8Array.length);
            console.log('📥 First 20 bytes:', Array.from(uint8Array.slice(0, 20)));

            // Десериализуем из BSON
            const result = SimpleBSON.deserialize(uint8Array);
            console.log('📊 Parsed spectrum data structure:', Object.keys(result));
            console.log('📊 Data sample:', result);

            // Проверяем структуру данных
            if (result.frequencies) {
                console.log('📊 Frequencies count:', result.frequencies.length);
                console.log('📊 First 5 freqs:', result.frequencies.slice(0, 5));
            }
            if (result.amplitudes) {
                console.log('📊 Amplitudes count:', result.amplitudes.length);
                console.log('📊 First 5 amps:', result.amplitudes.slice(0, 5));
            }
            if (result.data) {
                console.log('📊 Data dimensions:', result.data.length, 'x', result.data[0]?.length);
            }

            return result;

        } catch (error) {
            console.error('Error in postSpectrum:', error);
            throw error;
        }
    },
    // Добавить после метода postSpectrum, но перед export default dbApi

    async getSessions(body) {
        try {
            const response = await fetch(`${configApi.baseUrl}${DB_ENDPOINTS.GET_SESSIONS}`, {
                method: 'POST',
                headers: configApi.headers,
                body: JSON.stringify(body)
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            return response.json();
        } catch (error) {
            console.error('Error in getSessions:', error);
            throw error;
        }
    },

    async getSpectrumsByTaskId(body) {
        try {
            const response = await fetch(`${configApi.baseUrl}${DB_ENDPOINTS.GET_SPECTRUMS}`, {
                method: 'POST',
                headers: configApi.headers,
                body: JSON.stringify(body)
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            return response.json();
        } catch (error) {
            console.error('Error in getSpectrumsByTaskId:', error);
            throw error;
        }
    },

    async getSpectrumById(body) {
        try {
            const response = await fetch(`${configApi.baseUrl}${DB_ENDPOINTS.GET_SPECTRUM_BY_ID}`, {
                method: 'POST',
                headers: configApi.headers,
                body: JSON.stringify(body)
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            return response.json();
        } catch (error) {
            console.error('Error in getSpectrumById:', error);
            throw error;
        }
    }
};

export default dbApi;