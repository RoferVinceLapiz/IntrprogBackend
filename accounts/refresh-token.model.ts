import { DataTypes, Sequelize } from 'sequelize';

export default function refreshTokenModel(sequelize: Sequelize) {
  return sequelize.define(
    'RefreshToken',
    {
      token: {
        type: DataTypes.STRING
      },
      expires: {
        type: DataTypes.DATE
      },
      created: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      },
      createdByIp: {
        type: DataTypes.STRING
      },
      revoked: {
        type: DataTypes.DATE
      },
      revokedByIp: {
        type: DataTypes.STRING
      },
      replacedByToken: {
        type: DataTypes.STRING
      }
    },
    {
      timestamps: false
    }
  );
}