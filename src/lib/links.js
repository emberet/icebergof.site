/**
 * Every outbound link in one place, so updating one updates the whole site.
 */

export const CONTRACT_ADDRESS = 'ELGoiPVqiueZnqsaCRp8abdnoQGmMU9j7PWYc8U1pump'

export const BUY_URL = `https://pump.fun/coin/${CONTRACT_ADDRESS}`

export const X_HANDLE = 'iceberg_of'
export const X_URL = `https://x.com/${X_HANDLE}`

export const ORIGIN_URL = 'https://knowyourmeme.com/memes/iceberg-charts'

/** Shared props for any link that leaves the site. */
export const EXTERNAL_LINK = {
  target: '_blank',
  rel: 'noopener noreferrer',
}
