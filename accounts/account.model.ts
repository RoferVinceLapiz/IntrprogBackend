import { DataTypes, Sequelize } from 'sequelize';

export default function accountModel(sequelize: Sequelize) {
  return sequelize.define(
    'Account',
    {
      email: {
        type: DataTypes.STRING,
        allowNull: false
      },
      passwordHash: {
        type: DataTypes.STRING,
        allowNull: false
      },
      title: {
        type: DataTypes.STRING
      },
      firstName: {
        type: DataTypes.STRING,
        allowNull: false
      },
      lastName: {
        type: DataTypes.STRING,
        allowNull: false
      },
      acceptTerms: {
        type: DataTypes.BOOLEAN
      },
      role: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'User'
      },
      verificationToken: {
        type: DataTypes.STRING
      },
      verified: {
        type: DataTypes.DATE
      },
      resetToken: {
        type: DataTypes.STRING
      },
      resetTokenExpires: {
        type: DataTypes.DATE
      },
      passwordReset: {
        type: DataTypes.DATE
      },
      created: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      },
      updated: {
        type: DataTypes.DATE
      }
    },
    {
      timestamps: false
    }
  );
}