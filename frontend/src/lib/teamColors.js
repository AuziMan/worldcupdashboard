const TEAM_COLORS = {
  // International teams
  ARG: '#75aadb', AUS: '#ffcd00', BEL: '#ef3340', BIH: '#002395',
  BRA: '#ffdf00', CAN: '#d80621', CIV: '#f77f00', COL: '#fcd116',
  CPV: '#003893', CRO: '#ff0000', CUW: '#002b7f', CZE: '#d7141a',
  DEN: '#c60c30', ECU: '#ffdd00', EGY: '#ce1126', ENG: '#cf081f',
  ESP: '#aa151b', FRA: '#0055a4', GER: '#dd0000', GHA: '#ce1126',
  HAI: '#00209f', IRN: '#239f40', ITA: '#0066b3', JAM: '#009b3a',
  JPN: '#bc002d', KOR: '#cd2e3a', KSA: '#006c35', MAR: '#c1272d',
  MEX: '#006847', NED: '#f36c21', NGA: '#008753', NOR: '#ba0c2f',
  NZL: '#111111', PAN: '#da121a', PAR: '#d52b1e', POL: '#dc143c',
  POR: '#da291c', QAT: '#8a1538', RSA: '#007749', SCO: '#003078',
  SEN: '#00853f', SRB: '#c6363c', SUI: '#d52b1e', SWE: '#006aa7',
  TUN: '#e70013', TUR: '#e30a17', UKR: '#0057b7', URU: '#5bc0eb',
  USA: '#1a2e5a',

  // Premier League
  ARS: '#ef0107', AVL: '#670e36', BOU: '#da291c', BRE: '#e30613',
  BHA: '#0057b8', BUR: '#6c1d45', CHE: '#034694', CRY: '#1b458f',
  EVE: '#003399', FUL: '#cc0000', LEE: '#ffcd00', LIV: '#c8102e',
  MCI: '#6cabdd', MUN: '#da291c', NEW: '#241f20', NFO: '#dd0000',
  SUN: '#eb172b', TOT: '#132257', WHU: '#7a263a', WOL: '#fdb913',
  Arsenal: '#ef0107',
  'Aston Villa': '#670e36',
  Bournemouth: '#da291c',
  Brentford: '#e30613',
  Brighton: '#0057b8',
  Burnley: '#6c1d45',
  Chelsea: '#034694',
  'Crystal Palace': '#1b458f',
  Everton: '#003399',
  Fulham: '#cc0000',
  Leeds: '#ffcd00',
  Liverpool: '#c8102e',
  'Manchester City': '#6cabdd',
  'Manchester United': '#da291c',
  Newcastle: '#241f20',
  'Nottingham Forest': '#dd0000',
  Sunderland: '#eb172b',
  Tottenham: '#132257',
  'West Ham': '#7a263a',
  Wolves: '#fdb913',

  // Major League Soccer
  'Atlanta United FC': '#a71930',
  'Austin FC': '#00b140',
  'Charlotte FC': '#1a85c8',
  'Chicago Fire FC': '#c8102e',
  'Colorado Rapids': '#862633',
  'Columbus Crew': '#fef200',
  'D.C. United': '#ef3e42',
  'FC Cincinnati': '#f05323',
  'FC Dallas': '#bf0d3e',
  'Houston Dynamo FC': '#f68712',
  'Inter Miami CF': '#f7b5cd',
  LAFC: '#c39e6d',
  'LA Galaxy': '#00245d',
  'Minnesota United FC': '#8cd2f4',
  'CF Montréal': '#00529b',
  'Nashville SC': '#ece83a',
  'New England Revolution': '#0a2240',
  'New York City FC': '#6cace4',
  'Red Bull New York': '#ed1e36',
  'Orlando City SC': '#633492',
  'Philadelphia Union': '#b38707',
  'Portland Timbers': '#004812',
  'Real Salt Lake': '#b30838',
  'San Diego FC': '#00c6d7',
  'San Jose Earthquakes': '#0067b1',
  'Seattle Sounders FC': '#5d9741',
  'Sporting Kansas City': '#91b0d5',
  'St. Louis CITY SC': '#de0330',
  'Toronto FC': '#b81137',
  'Vancouver Whitecaps': '#00245e',
}

const FALLBACK_COLORS = [
  '#0057b8',
  '#c8102e',
  '#008753',
  '#f2c300',
  '#633492',
  '#00a6a6',
  '#862633',
  '#ef6c00',
]

function fallbackColor(team) {
  const identity = String(team?.id || team?.name || team?.shortName || '')
  let hash = 0
  for (const char of identity) hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0
  return FALLBACK_COLORS[Math.abs(hash) % FALLBACK_COLORS.length]
}

export function getTeamColor(team) {
  return (
    TEAM_COLORS[team?.tla] ||
    TEAM_COLORS[team?.name] ||
    TEAM_COLORS[team?.shortName] ||
    fallbackColor(team)
  )
}
