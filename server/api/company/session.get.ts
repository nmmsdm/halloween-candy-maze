import { getCompanySession } from '../../utils/company-auth'

export default defineEventHandler((event) => {
  const company = getCompanySession(event)
  if (!company) return { company: null }
  return {
    company: {
      code: company.code,
      name: company.name,
      ownerEmail: company.ownerEmail,
      playerIcon: company.playerIcon
    }
  }
})
