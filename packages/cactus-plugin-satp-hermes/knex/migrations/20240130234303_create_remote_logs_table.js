exports.up = async (knex) => {
  return await knex.schema.createTable("remote-logs", function (table) {
    table.string("key").notNullable();
    table.string("hash").notNullable();
    table.string("signature").notNullable();
    table.string("signerPubKey").notNullable();
    table.primary("key");
  });
};

exports.down = async (knex) => {
  return await knex.schema.dropTable("remote-logs");
};
