module.exports = {
  title: 'Weaver: DLT Interoperability Framework',
  tagline: 'Documentation',
  url: 'https://VRamakrishna.github.io',
  baseUrl: '/weaver-dlt-interoperability/',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  favicon: 'shared/favicon.ico',
  organizationName: 'VRamakrishna',
  projectName: 'VRamakrishna.github.io',
  themeConfig: {
    navbar: {
      title: 'Weaver',
      logo: {
        alt: 'Weaver',
        src: 'shared/logo.svg',
      },
      items: [
        {
          to: 'docs/external/introduction',
          activeBasePath: 'docs',
          label: 'Docs',
          position: 'left',
        },
        {
          to: 'blog',
          label: 'Blog',
          position: 'left'
        },
        {
          href: 'https://github.com/VRamakrishna/weaver-dlt-interoperability',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'light',
      links: [        
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Weaver Framework.`,
    },
  },
  presets: [
    [
      '@docusaurus/preset-classic',
      {
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          // Please change this to your repo.
          editUrl:
            'https://github.com/VRamakrishna/weaver-dlt-interoperability/edit/master/',
        },        
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      },
    ],
  ],
};
