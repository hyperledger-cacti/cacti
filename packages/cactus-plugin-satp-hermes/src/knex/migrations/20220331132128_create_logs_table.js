exports.up = async (knex) => {
  return await knex.schema.createTable("logs", function (table) {
    table.string("sessionID").notNullable();
    table.string("type").notNullable();
    table.string("key").notNullable();
    table.string("operation").notNullable();
    table.string("timestamp").notNullable();
    table.string("data").notNullable();
    table.primary("key");
  });
};

exports.down = async (knex) => {
  return await knex.schema.dropTable("logs");
};
