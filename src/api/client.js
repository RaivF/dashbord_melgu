import axios from 'axios'

export async function getApplicantsStatistics(period, signal) {
  const response = await axios.post(
    '/api/applicants-statistics',
    { period },
    {
      signal,
      timeout: 45000,
    },
  )

  return response.data
}
