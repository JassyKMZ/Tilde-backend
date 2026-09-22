import type { Schema, Struct } from '@strapi/strapi';

export interface AboutHeading extends Struct.ComponentSchema {
  collectionName: 'components_about_headings';
  info: {
    displayName: 'Heading';
    icon: 'hashtag';
  };
  attributes: {
    title: Schema.Attribute.String;
  };
}

export interface AboutTextblock extends Struct.ComponentSchema {
  collectionName: 'components_about_textblocks';
  info: {
    displayName: 'Textblock';
    icon: 'hashtag';
  };
  attributes: {
    text: Schema.Attribute.Blocks;
    title: Schema.Attribute.String;
  };
}

export interface ImpressumHeading1 extends Struct.ComponentSchema {
  collectionName: 'components_impressum_heading_1s';
  info: {
    displayName: 'Heading 1';
    icon: 'italic';
  };
  attributes: {
    Titel: Schema.Attribute.String;
  };
}

export interface ImpressumHeading2 extends Struct.ComponentSchema {
  collectionName: 'components_impressum_heading_2s';
  info: {
    displayName: 'Heading 2';
    icon: 'italic';
  };
  attributes: {
    Titel: Schema.Attribute.String;
  };
}

export interface ImpressumHeading3 extends Struct.ComponentSchema {
  collectionName: 'components_impressum_heading_3s';
  info: {
    displayName: 'Heading 3';
    icon: 'italic';
  };
  attributes: {
    Titel: Schema.Attribute.String;
  };
}

export interface ImpressumHeading4 extends Struct.ComponentSchema {
  collectionName: 'components_impressum_heading_4s';
  info: {
    displayName: 'Heading 4';
    icon: 'italic';
  };
  attributes: {
    Titel: Schema.Attribute.String;
  };
}

export interface ImpressumInfoblock extends Struct.ComponentSchema {
  collectionName: 'components_impressum_infoblocks';
  info: {
    displayName: 'Infoblock';
    icon: 'bulletList';
  };
  attributes: {
    EMail: Schema.Attribute.String;
    Fax: Schema.Attribute.String;
    Firma: Schema.Attribute.String;
    Name: Schema.Attribute.String;
    OrtPLZ: Schema.Attribute.String;
    Strasse: Schema.Attribute.String;
    Telefon: Schema.Attribute.String;
    Website: Schema.Attribute.String;
  };
}

export interface ImpressumLink extends Struct.ComponentSchema {
  collectionName: 'components_impressum_links';
  info: {
    displayName: 'Link';
    icon: 'attachment';
  };
  attributes: {
    LinkAdresse: Schema.Attribute.String;
    LinkName: Schema.Attribute.String;
  };
}

export interface ImpressumLongText extends Struct.ComponentSchema {
  collectionName: 'components_impressum_long_texts';
  info: {
    displayName: 'Long Text';
    icon: 'hashtag';
  };
  attributes: {
    Text: Schema.Attribute.Blocks;
  };
}

export interface ImpressumTextblock extends Struct.ComponentSchema {
  collectionName: 'components_impressum_textblocks';
  info: {
    displayName: 'Textblock';
    icon: 'layer';
  };
  attributes: {
    Text: Schema.Attribute.Text;
  };
}

export interface LandingButton extends Struct.ComponentSchema {
  collectionName: 'components_landing_buttons';
  info: {
    displayName: 'Button';
    icon: 'arrowRight';
  };
  attributes: {
    content: Schema.Attribute.String;
    linkTo: Schema.Attribute.String;
  };
}

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

export interface ProfilGruppe extends Struct.ComponentSchema {
  collectionName: 'components_profil_gruppes';
  info: {
    displayName: 'Gruppe';
    icon: 'puzzle';
  };
  attributes: {
    kategories: Schema.Attribute.Relation<
      'oneToMany',
      'api::category.category'
    >;
    kinder: Schema.Attribute.Component<'profil.kind', true>;
    maxAge: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          max: 99;
          min: 0;
        },
        number
      >;
    minAge: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          max: 99;
          min: 0;
        },
        number
      >;
    name: Schema.Attribute.String;
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
    avatarIndex: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          max: 3;
          min: 0;
        },
        number
      >;
    favoriteCategories: Schema.Attribute.Relation<
      'manyToMany',
      'api::category.category'
    >;
    name: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface ProfilKindGruppe extends Struct.ComponentSchema {
  collectionName: 'components_profil_kind_gruppes';
  info: {
    displayName: 'kindGruppe';
  };
  attributes: {
    Alter: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          max: 18;
          min: 0;
        },
        number
      >;
    name: Schema.Attribute.String;
  };
}

export interface RoadmapMilestone extends Struct.ComponentSchema {
  collectionName: 'components_roadmap_milestones';
  info: {
    displayName: 'milestone';
    icon: 'check';
  };
  attributes: {
    description: Schema.Attribute.Blocks;
    isDone: Schema.Attribute.Boolean;
    progress: Schema.Attribute.Enumeration<['Geplant', 'In Arbeit', 'Testen']>;
    title: Schema.Attribute.String;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'about.heading': AboutHeading;
      'about.textblock': AboutTextblock;
      'impressum.heading-1': ImpressumHeading1;
      'impressum.heading-2': ImpressumHeading2;
      'impressum.heading-3': ImpressumHeading3;
      'impressum.heading-4': ImpressumHeading4;
      'impressum.infoblock': ImpressumInfoblock;
      'impressum.link': ImpressumLink;
      'impressum.long-text': ImpressumLongText;
      'impressum.textblock': ImpressumTextblock;
      'landing.button': LandingButton;
      'landing.starts-text': LandingStartsText;
      'profil.gruppe': ProfilGruppe;
      'profil.kind': ProfilKind;
      'profil.kind-gruppe': ProfilKindGruppe;
      'roadmap.milestone': RoadmapMilestone;
    }
  }
}
