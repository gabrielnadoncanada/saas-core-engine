type Member = {
  id: string;
  email: string;
  role: "owner" | "admin" | "member";
  joinedAt: string;
};

export function TeamMembersTable(props: { members: Member[] }) {
  return (
    <div style={{ marginTop: 12, overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={th}>Email</th>
            <th style={th}>Role</th>
            <th style={th}>Joined</th>
          </tr>
        </thead>
        <tbody>
          {props.members.map((m) => (
            <tr key={m.id}>
              <td style={td}>{m.email}</td>
              <td style={td}>{m.role}</td>
              <td style={td}>{new Date(m.joinedAt).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const th: React.CSSProperties = {
  textAlign: "left",
  padding: "10px 8px",
  borderBottom: "1px solid #eee",
  fontSize: 12,
  color: "#666",
};

const td: React.CSSProperties = {
  padding: "10px 8px",
  borderBottom: "1px solid #f1f1f1",
  fontSize: 14,
};
