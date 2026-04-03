import * as admin from "firebase-admin";
import * as functions from "firebase-functions";

admin.initializeApp();

const ALLOWED_ROLES = ["President", "Vice President"];

export const deleteAuthUser = functions.https.onCall(async (request) => {
  // Must be authenticated
  if (!request.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "You must be logged in."
    );
  }

  const callerUid = request.auth.uid;
  const targetUid: string = request.data.uid;

  if (!targetUid) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Missing uid."
    );
  }

  // Check caller's role in Firestore
  const callerDoc = await admin.firestore().collection("users").doc(callerUid).get();
  if (!callerDoc.exists) {
    throw new functions.https.HttpsError("permission-denied", "Caller not found.");
  }
  const callerRole: string = callerDoc.data()?.role || "";
  if (!ALLOWED_ROLES.includes(callerRole)) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only President and Vice President can delete users."
    );
  }

  // Delete from Firebase Auth
  await admin.auth().deleteUser(targetUid);

  return { success: true };
});
