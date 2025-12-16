import type { Schema, Struct } from '@strapi/strapi';

export interface LandingStartsText extends Struct.ComponentSchema {
  collectionName: 'components_landing_starts_texts';
  info: {
    displayName: 'StartText';
    icon: 'bulletList';
  };
  attributes: {
    Beschreibung: Schema.Attribute.Text;
    Titel: Schema.Attribute.String;
  };
}

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
      'landing.starts-text': LandingStartsText;
      'profil.kind': ProfilKind;
    }
  }
}
