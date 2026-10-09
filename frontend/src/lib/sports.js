export const SPORTS = {
  soccer: {
    label: 'Soccer',
    detail: 'Live now',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/d/d3/Soccerball.svg',
    // EPL's accent — soccer bundles epl/mls/wc under one tile, and EPL is
    // the default league (see App.jsx's LEAGUES.epl.accent).
    accent: '#2563eb',
  },
  mlb: {
    label: 'MLB',
    detail: 'Live now',
    logo: 'https://a.espncdn.com/i/teamlogos/leagues/500/mlb.png',
    accent: '#041E42',
  },
  nba: {
    label: 'NBA',
    detail: 'Live now',
    logo: 'https://a.espncdn.com/i/teamlogos/leagues/500/nba.png',
    accent: '#C8102E',
  },
  nfl: {
    label: 'NFL',
    detail: 'Live now',
    logo: 'https://a.espncdn.com/i/teamlogos/leagues/500/nfl.png',
    accent: '#013369',
  },
  ncaaf: {
    label: 'NCAAF',
    detail: 'Live now',
    // ESPN has no unified college-football "league" crest the way it does
    // for nfl/nba/mlb (this is the icon its own site uses in that slot).
    logo: 'https://a.espncdn.com/redesign/assets/img/icons/ESPN-icon-football-college.png',
    accent: '#8B2323',
  },
  ufc: {
    label: 'UFC',
    detail: 'Live now',
    logo: 'https://a.espncdn.com/i/teamlogos/leagues/500/ufc.png',
    accent: '#D20A0A',
  },
  f1: {
    label: 'F1',
    detail: 'Live now',
    logo: 'https://a.espncdn.com/i/teamlogos/leagues/500/f1.png',
    accent: '#E10600',
  },
}
