import React, { useMemo, useState } from 'react';
import { Badge, Button, Dropdown, List, Typography } from 'antd';
import { BellOutlined } from '@ant-design/icons';
import { useNotifications } from '../../context/NotificationsContext';
import { useNavigate } from 'react-router-dom';

export const NotificationsBell: React.FC = () => {
  const { notifications, unreadCount, markAllRead, markRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const items = useMemo(() => notifications, [notifications]);

  const content = (
    <div style={{ width: 360, maxHeight: 420, overflowY: 'auto', background: '#fff', borderRadius: '2px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px'}}>
        <Typography.Text style={{ fontSize: '18px' }} strong>Notificaciones</Typography.Text>
        {/* <Button type="link" size="small" onClick={markAllRead} disabled={unreadCount === 0}>Marcar todas como leídas</Button> */}
      </div>
      {items.length === 0 ? (
        <div style={{ padding: 16, textAlign: 'center' }}>Sin notificaciones</div>
      ) : (
        <List
          itemLayout="horizontal"
          dataSource={items}
          style={{ padding: '8px' }}
          renderItem={(item) => (
            <List.Item
              onClick={() => {
                if (item.reqId) navigate(`/requerimientos/recibidos/nuevo?id=${item.reqId}`);
                markRead(item.id);
                setOpen(false);
              }}
              style={{ cursor: 'pointer', background: item.read ? 'transparent' : '#ffffff' }}
            >
              <List.Item.Meta
                title={<span style={{ fontWeight: item.read ? 400 : 600 }}>{item.title}</span>}
                description={
                  <div>
                    {item.description && <div>{item.description}</div>}
                    <small style={{ color: '#888' }}>{new Date(item.createdAt).toLocaleString()}</small>
                  </div>
                }
              />
            </List.Item>
          )}
        />
      )}
    </div>
  );

  return (
    <Dropdown
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) {
          // Optionally mark all read on open
          // markAllRead();
        }
      }}
      dropdownRender={() => content}
      placement="bottomRight"
      trigger={["click"]}
    >
      <Badge count={unreadCount} overflowCount={99} size="small">
        <Button type="text" icon={<BellOutlined />} />
      </Badge>
    </Dropdown>
  );
};

export default NotificationsBell;
