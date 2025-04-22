// auth.js
import { UserManager } from 'https://cdn.skypack.dev/oidc-client-ts';

const cognitoAuthConfig = {
  authority: "https://ap-southeast-1ypgkwwghv.auth.ap-southeast-1.amazoncognito.com",
  client_id: "p36ba0bp3u8sqr55fc682n714",
  redirect_uri: "https://staging.d3744hmwully3z.amplifyapp.com/index.html",
  response_type: "code",
  scope: "openid email profile"
};

export const userManager = new UserManager({ ...cognitoAuthConfig });

export async function signOutRedirect () {
  const logoutUri = cognitoAuthConfig.redirect_uri;
  window.location.href = `${cognitoAuthConfig.authority}/logout?client_id=${cognitoAuthConfig.client_id}&logout_uri=${encodeURIComponent(logoutUri)}`;
}
