import pool from "@/lib/db";
import { PushSubscriptionRecord } from "@/modules/users/types";
import { RowDataPacket } from "mysql2";

export const getPushSubscriptionsForUser = async (
    userId: string,
): Promise<PushSubscriptionRecord[]> => {
    const [rows] = await pool.query<RowDataPacket[]>(
        "SELECT endpoint, expiration_time, p256dh_key, auth_key FROM push_subscriptions WHERE user_id = ?",
        [userId],
    );

    return rows.map((row) => ({
        endpoint: row.endpoint,
        expirationTime: row.expiration_time ? Number(row.expiration_time) : null,
        keys: {
            p256dh: row.p256dh_key,
            auth: row.auth_key,
        },
    }));
};

export const addPushSubscriptionForUser = async (
    userId: string,
    subscription: PushSubscriptionRecord,
): Promise<void> => {
    await pool.query(
        `INSERT INTO push_subscriptions (user_id, endpoint, expiration_time, p256dh_key, auth_key)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE expiration_time = VALUES(expiration_time), p256dh_key = VALUES(p256dh_key), auth_key = VALUES(auth_key)`,
        [
            userId,
            subscription.endpoint,
            subscription.expirationTime,
            subscription.keys.p256dh,
            subscription.keys.auth,
        ],
    );
};

export const removePushSubscriptionForUser = async (
    userId: string,
    endpoint: string,
): Promise<void> => {
    await pool.query(
        "DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?",
        [userId, endpoint],
    );
};
