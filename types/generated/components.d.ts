import type { Schema, Struct } from '@strapi/strapi';

export interface ProfilKind extends Struct.ComponentSchema {
  collectionName: 'components_profil_kinds';
  info: {
    displayName: 'Kind';
    icon: 'user';
  };
  attributes: {
    alter: Schema.Attribute.Integer;
    favoriteCategories: Schema.Attribute.Relation<
      'manyToMany',
      'api::category.category'
    >;
    name: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'profil.kind': ProfilKind;
    }
  }
}
