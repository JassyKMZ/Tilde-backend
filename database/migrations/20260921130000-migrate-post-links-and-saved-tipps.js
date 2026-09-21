"use strict";

module.exports = {
  async up(knex) {
    await knex.transaction(async (trx) => {
      const posts = trx.schema.withSchema("public");
      const savedTipps = trx.schema.withSchema("public");

      if (await posts.hasColumn("posts", "buchung")) {
        if (await posts.hasColumn("posts", "link_to")) {
          await trx("posts")
            .whereNull("link_to")
            .whereNotNull("buchung")
            .update({ link_to: trx.ref("buchung") });
          await posts.table("posts").dropColumn("buchung");
        } else {
          await posts.table("posts").renameColumn("buchung", "link_to");
        }
      }

      if (
        await savedTipps.hasColumn(
          "user_profiles_saved_tipps_lnk",
          "tipp_section_id",
        )
      ) {
        await trx.raw(`
          DO $$
          DECLARE constraint_name text;
          BEGIN
            FOR constraint_name IN
              SELECT tc.constraint_name
              FROM information_schema.table_constraints tc
              JOIN information_schema.key_column_usage kcu
                ON tc.constraint_name = kcu.constraint_name
               AND tc.table_schema = kcu.table_schema
               AND tc.table_name = kcu.table_name
              WHERE tc.table_schema = 'public'
                AND tc.table_name = 'user_profiles_saved_tipps_lnk'
                AND tc.constraint_type = 'FOREIGN KEY'
                AND kcu.column_name = 'tipp_section_id'
            LOOP
              EXECUTE format(
                'ALTER TABLE public.user_profiles_saved_tipps_lnk DROP CONSTRAINT %I',
                constraint_name
              );
            END LOOP;
          END $$;
        `);

        if (
          await savedTipps.hasColumn("user_profiles_saved_tipps_lnk", "post_id")
        ) {
          await savedTipps
            .table("user_profiles_saved_tipps_lnk")
            .dropColumn("tipp_section_id");
        } else {
          await savedTipps
            .table("user_profiles_saved_tipps_lnk")
            .renameColumn("tipp_section_id", "post_id");
        }

        await trx("user_profiles_saved_tipps_lnk")
          .whereNotExists(function missingPost() {
            this.select(trx.raw("1"))
              .from("posts")
              .whereRaw("posts.id = user_profiles_saved_tipps_lnk.post_id");
          })
          .del();

        const postForeignKey = await trx.raw(`
          SELECT 1
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
           AND tc.table_schema = kcu.table_schema
           AND tc.table_name = kcu.table_name
          JOIN information_schema.constraint_column_usage ccu
            ON tc.constraint_name = ccu.constraint_name
           AND tc.table_schema = ccu.table_schema
          WHERE tc.table_schema = 'public'
            AND tc.table_name = 'user_profiles_saved_tipps_lnk'
            AND tc.constraint_type = 'FOREIGN KEY'
            AND kcu.column_name = 'post_id'
            AND ccu.table_name = 'posts'
          LIMIT 1;
        `);

        if (!postForeignKey.rows.length) {
          await trx.raw(`
            ALTER TABLE public.user_profiles_saved_tipps_lnk
            ADD CONSTRAINT user_profiles_saved_tipps_lnk_ifk
            FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;
          `);
        }
      }
    });
  },

  async down(knex) {
    await knex.transaction(async (trx) => {
      const posts = trx.schema.withSchema("public");
      const savedTipps = trx.schema.withSchema("public");

      if (await posts.hasColumn("posts", "link_to")) {
        await posts.table("posts").renameColumn("link_to", "buchung");
      }

      if (
        await savedTipps.hasColumn("user_profiles_saved_tipps_lnk", "post_id")
      ) {
        await savedTipps
          .table("user_profiles_saved_tipps_lnk")
          .renameColumn("post_id", "tipp_section_id");
      }
    });
  },
};
