import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateAuditLogsTable1703000000000 implements MigrationInterface {
    name = 'CreateAuditLogsTable1703000000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: 'audit_logs',
                columns: [
                    {
                        name: 'id',
                        type: 'uuid',
                        isPrimary: true,
                        generationStrategy: 'uuid',
                        default: 'gen_random_uuid()',
                    },
                    {
                        name: 'user_id',
                        type: 'uuid',
                        isNullable: true,
                    },
                    {
                        name: 'email',
                        type: 'varchar',
                        length: '255',
                        isNullable: true,
                    },
                    {
                        name: 'ip_address',
                        type: 'varchar',
                        length: '45', // IPv6 compatible
                        isNullable: false,
                    },
                    {
                        name: 'user_agent',
                        type: 'text',
                        isNullable: true,
                    },
                    {
                        name: 'action',
                        type: 'varchar',
                        length: '100',
                        isNullable: false,
                    },
                    {
                        name: 'resource',
                        type: 'varchar',
                        length: '100',
                        isNullable: true,
                    },
                    {
                        name: 'outcome',
                        type: 'enum',
                        enum: ['success', 'failure', 'blocked'],
                        isNullable: false,
                    },
                    {
                        name: 'details',
                        type: 'jsonb',
                        isNullable: true,
                    },
                    {
                        name: 'session_id',
                        type: 'varchar',
                        length: '255',
                        isNullable: true,
                    },
                    {
                        name: 'risk_score',
                        type: 'float',
                        isNullable: true,
                    },
                    {
                        name: 'timestamp',
                        type: 'timestamptz',
                        default: 'CURRENT_TIMESTAMP',
                        isNullable: false,
                    },
                ],
                foreignKeys: [
                    {
                        columnNames: ['user_id'],
                        referencedTableName: 'users',
                        referencedColumnNames: ['id'],
                        onDelete: 'SET NULL',
                    },
                ],
            }),
            true,
        );

        // Create indexes for performance
        await queryRunner.createIndex(
            'audit_logs',
            new TableIndex({
                name: 'IDX_audit_logs_user_id_timestamp',
                columnNames: ['user_id', 'timestamp'],
            }),
        );

        await queryRunner.createIndex(
            'audit_logs',
            new TableIndex({
                name: 'IDX_audit_logs_ip_address_timestamp',
                columnNames: ['ip_address', 'timestamp'],
            }),
        );

        await queryRunner.createIndex(
            'audit_logs',
            new TableIndex({
                name: 'IDX_audit_logs_action_timestamp',
                columnNames: ['action', 'timestamp'],
            }),
        );

        await queryRunner.createIndex(
            'audit_logs',
            new TableIndex({
                name: 'IDX_audit_logs_outcome_timestamp',
                columnNames: ['outcome', 'timestamp'],
            }),
        );

        await queryRunner.createIndex(
            'audit_logs',
            new TableIndex({
                name: 'IDX_audit_logs_timestamp',
                columnNames: ['timestamp'],
            }),
        );

        await queryRunner.createIndex(
            'audit_logs',
            new TableIndex({
                name: 'IDX_audit_logs_user_id',
                columnNames: ['user_id'],
            }),
        );

        await queryRunner.createIndex(
            'audit_logs',
            new TableIndex({
                name: 'IDX_audit_logs_ip_address',
                columnNames: ['ip_address'],
            }),
        );

        await queryRunner.createIndex(
            'audit_logs',
            new TableIndex({
                name: 'IDX_audit_logs_action',
                columnNames: ['action'],
            }),
        );

        await queryRunner.createIndex(
            'audit_logs',
            new TableIndex({
                name: 'IDX_audit_logs_outcome',
                columnNames: ['outcome'],
            }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('audit_logs');
    }
}