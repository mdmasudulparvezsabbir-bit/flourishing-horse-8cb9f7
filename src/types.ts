export type Role = "Admin" | "Manager" | "Billing Executive" | "Employee" | "Technician";

export interface User {
  id: string;
  username: string;
  name: string;
  role: Role;
  photo?: string | null;
}

export interface Income {
  id: string;
  userId: string;
  category: string;
  amount: number;
  source: "Cash" | "DBBL" | "Bkash" | "Nagad";
  date: string;
  note?: string;
}

export interface Expense {
  id: string;
  userId: string;
  category: string;
  subcategory?: string;
  amount: number;
  source: "Cash" | "DBBL" | "Bkash" | "Nagad";
  date: string;
  status: "Pending" | "Verified" | "Approved";
  managerNote?: string;
  note?: string;
  attachment?: string | null;
}

export interface Settings {
  companyName: string;
  logo?: string | null;
  balances: {
    cash: number;
    bkash: number;
    nagad: number;
    dbbl: number;
  };
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning";
  date: string;
  read: boolean;
}

export interface Room {
  id: string;
  name: string;
  createdAt: string;
}

export interface RoomMember {
  roomId: string;
  userId: string;
  role: string;
  joinedAt: string;
}

export interface Message {
  id: string;
  roomId: string;
  userId: string;
  body: string;
  insertedAt: string;
  user?: User;
}
