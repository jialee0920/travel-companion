import type { AirtableUser } from '@/lib/airtable/users';
import type { UserProfile } from '@/lib/user-profile';

export function airtableUserToUserProfile(user: AirtableUser): UserProfile {
  return {
    id: user.id,
    name: user.name,
    nickname: user.nickname.trim(),
    phone: user.phone,
    region: user.region,
    avatar_url: user.avatarUrl,
    bio: user.bio,
    interest_categories: user.interestCategories,
    profile_completed: user.profileCompleted,
    age: user.age,
  };
}
