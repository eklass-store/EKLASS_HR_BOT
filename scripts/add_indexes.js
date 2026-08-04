const BASE_URL = 'https://eklass-hr.pages.dev';

async function addIndexes() {
  const ddl = [
    "CREATE INDEX IF NOT EXISTS idx_leaves_created_at ON Leaves(created_at DESC)",
    "CREATE INDEX IF NOT EXISTS idx_loans_created_at ON Loans(created_at DESC)",
    "CREATE INDEX IF NOT EXISTS idx_leaves_status ON Leaves(status)",
    "CREATE INDEX IF NOT EXISTS idx_loans_status ON Loans(status)",
    "CREATE INDEX IF NOT EXISTS idx_attendance_date_desc ON Attendance(date DESC, check_in_time DESC)"
  ];

  for (const sql of ddl) {
    console.log(`Executing: ${sql}`);
    const res = await fetch(`${BASE_URL}/api/dev/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql })
    });
    const data = await res.json();
    if (!data.success) {
      console.error('Failed:', data.error);
    } else {
      console.log('Success!');
    }
  }
}

addIndexes();
