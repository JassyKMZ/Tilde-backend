"use strict";

async function sendNewPostNotifications(post) {
  console.log("Sending new post notifications for post:", post.titel);
  // Get all user profiles with push enabled
  const userProfiles = await strapi
    .documents("api::user-profile.user-profile")
    .findMany({
      filters: { pushNotificationsEnabled: true },
      populate: [
        "user",
        "kategories",
        "klasses",
        "kinder",
        "kinder.favoriteCategories",
      ],
    });

  console.log("Found user profiles with push enabled:", userProfiles.length);

  const postCategories = post.kategories?.map((c) => c.id) || [];
  const postKlasses = post.klasses?.map((k) => k.id) || [];
  const postMinAge = post.minAge || 0;
  const postMaxAge = post.maxAge || 18;

  for (const profile of userProfiles) {
    const userCategories = profile.kategories?.map((c) => c.id) || [];
    const userKlasses = profile.klasses?.map((k) => k.id) || [];
    const userMinAge = profile.minAge || 0;
    const userMaxAge = profile.maxAge || 18;

    let userMatches = false;
    let kidMatches = [];

    // Check user preferences
    const categoryMatch = postCategories.some((id) =>
      userCategories.includes(id)
    );
    const klasseMatch = postKlasses.some((id) => userKlasses.includes(id));
    const ageMatch = postMinAge <= userMaxAge && postMaxAge >= userMinAge;

    if (categoryMatch || klasseMatch || ageMatch) {
      userMatches = true;
    }

    // TEMP: For testing, always match user
    userMatches = true;

    // Check kids
    // if (profile.kinder) {
    //   for (const kid of profile.kinder) {
    //     const kidAge = kid.alter;
    //     if (kidAge >= postMinAge && kidAge <= postMaxAge) {
    //       const kidCategories = kid.favoriteCategories?.map((c) => c.id) || [];
    //       if (postCategories.some(id => kidCategories.includes(id))) {
    //         kidMatches.push(kid.name);
    //       }
    //     }
    //   }
    // }

    // Send notifications
    const url = `/post/${post.documentId}`; // Frontend route

    if (userMatches) {
      console.log("Sending user match notification to user:", profile.user.id);
      await strapi
        .plugin("unified-notification")
        .service("notification")
        .sendToUser(profile.user.id, {
          title: "New Post Published",
          body: "A new post that you might like was published",
          data: { url },
        });
    }

    for (const kidName of kidMatches) {
      console.log(
        "Sending kid match notification to user:",
        profile.user.id,
        "for kid:",
        kidName
      );
      await strapi
        .plugin("unified-notification")
        .service("notification")
        .sendToUser(profile.user.id, {
          title: "New Post Published",
          body: `A post that ${kidName} might like, was published`,
          data: { url },
        });
    }
  }
}

// Disabled: Transaction conflicts with database queries
// Use cron job instead to send notifications for recently published posts
module.exports = {};
