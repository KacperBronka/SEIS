import { prisma } from '../../../lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(request) {
  try {
    const body = await request.json()
    const { nick, email, password, ageVerified, seisToken } = body

    if (!nick || !email || !password) {
      return Response.json({ error: 'Wypelnij wszystkie pola' }, { status: 400 })
    }

    if (!ageVerified) {
      return Response.json({ error: 'Wymagana weryfikacja wieku przez SEIS' }, { status: 400 })
    }

    if (password.length < 8) {
      return Response.json({ error: 'Haslo musi miec min. 8 znakow' }, { status: 400 })
    }

    if (!/[A-Z]/.test(password)) {
      return Response.json({ error: 'Haslo musi zawierac min. 1 duza litere' }, { status: 400 })
    }

    if (!/[a-z]/.test(password)) {
      return Response.json({ error: 'Haslo musi zawierac min. 1 mala litere' }, { status: 400 })
    }

    const existing = await prisma.user.findFirst({
      where: { OR: [{ nick }, { email }] }
    })

    if (existing) {
      if (existing.nick === nick) return Response.json({ error: 'Ten nick jest juz zajety' }, { status: 409 })
      if (existing.email === email) return Response.json({ error: 'Ten e-mail jest juz zajety' }, { status: 409 })
    }

    const passwordHash = await bcrypt.hash(password, 12)

    const user = await prisma.user.create({
      data: {
        nick,
        email,
        passwordHash,
        ageVerified: true,
        seisToken: seisToken || null
      }
    })

    console.log('Utworzono konto:', user.nick, '| SEIS token:', user.seisToken ? 'zapisany' : 'brak')

    return Response.json({ success: true, user: { id: user.id, nick: user.nick, email: user.email } }, { status: 201 })

  } catch (err) {
    console.error(err)
    return Response.json({ error: 'Blad serwera' }, { status: 500 })
  }
}
