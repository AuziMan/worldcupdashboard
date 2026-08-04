/* eslint-disable react/prop-types */
import { useEffect } from 'react'

const SITE_NAME = 'GAMEFOLD'
const DEFAULT_DESCRIPTION = 'Follow live sports scores, upcoming fixtures, recent results, team rosters, league standings, and tournament brackets with GAMEFOLD.'

function setMeta(selector, attribute, value) {
  const element = document.head.querySelector(selector)
  if (element && value) element.setAttribute(attribute, value)
}

export default function Seo({ title, description = DEFAULT_DESCRIPTION, robots = 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1' }) {
  useEffect(() => {
    const fullTitle = title?.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`
    document.title = fullTitle

    setMeta('meta[name="description"]', 'content', description)
    setMeta('meta[name="robots"]', 'content', robots)
    setMeta('meta[property="og:title"]', 'content', fullTitle)
    setMeta('meta[property="og:description"]', 'content', description)
    setMeta('meta[name="twitter:title"]', 'content', fullTitle)
    setMeta('meta[name="twitter:description"]', 'content', description)
  }, [description, robots, title])

  return null
}
