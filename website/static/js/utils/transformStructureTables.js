export const transformStructureTables = (structureTable) => {
    return Object.entries(structureTable).map(([sectionTitle, sectionTables]) => {
        const tables = Object.entries(sectionTables).map(([tableNameEn, tableNameRu]) => ({
            tableNameEn,
            tableNameRu
        }));

        return {
            title: sectionTitle,
            tables
        };
    });
};