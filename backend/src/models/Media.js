import { DataTypes } from 'sequelize';

export default function (sequelize) {
    const Media = sequelize.define('Media', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        type: {
            type: DataTypes.ENUM('image', 'video'),
            allowNull: false
        },
        url: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        sourceUrl: {
            type: DataTypes.TEXT,
            allowNull: false,
            field: 'source_url'
        },
        altText: {
            type: DataTypes.TEXT,
            allowNull: true,
            field: 'alt_text'
        }
    }, {
        tableName: 'media',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: false,
        indexes: [
            { fields: ['type'] },
            { fields: ['source_url'] }
        ]
    });

    return Media;
}
