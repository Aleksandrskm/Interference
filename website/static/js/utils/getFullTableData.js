import { dbApi } from '../api/dbApi.js';

export const getFullTableData = async (tableName) => {
    try {
        const [tableInfo, tableData] = await Promise.all([
            dbApi.tableInfo(tableName),
            dbApi.getTable(tableName)
        ]);
        return { tableInfo, tableData };
    } catch (error) {
        console.error('Error loading table data:', error);
        throw error;
    }
};