import { useState } from 'react';
import { Modal, Form, Input, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { createPackageAPI } from '@/api/package';
import usePackageStore from '@/stores/packageStore';

interface AddPackageModalProps {
  open: boolean;
  onClose: () => void;
}

const AddPackageModal: React.FC<AddPackageModalProps> = ({ open, onClose }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const fetchPackages = usePackageStore((s) => s.fetchPackages);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      const res = await createPackageAPI({
        trackingNo: values.trackingNo.trim(),
        alias: values.alias?.trim() || undefined,
      });
      const data = res.data!;
      message.success(`添加成功！已识别为${data.carrier}`);
      form.resetFields();
      onClose();
      await fetchPackages();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'errorFields' in err) {
        return;
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      title={
        <span>
          <PlusOutlined style={{ marginRight: 8, color: '#1677ff' }} />
          添加快递
        </span>
      }
      open={open}
      onOk={handleSubmit}
      onCancel={handleCancel}
      okText="添加"
      cancelText="取消"
      confirmLoading={loading}
      destroyOnClose
      width={480}
    >
      <Form
        form={form}
        layout="vertical"
        style={{ marginTop: 16 }}
        autoComplete="off"
      >
        <Form.Item
          name="trackingNo"
          label="快递单号"
          rules={[
            { required: true, message: '请输入快递单号' },
            { max: 50, message: '单号长度不能超过50个字符' },
            {
              pattern: /^[^\s\u4e00-\u9fa5]+$/,
              message: '单号不能包含中文或空格',
            },
          ]}
        >
          <Input placeholder="请输入快递单号，如 SF1234567890" allowClear />
        </Form.Item>
        <Form.Item
          name="alias"
          label="别名（选填）"
          rules={[{ max: 50, message: '别名长度不能超过50个字符' }]}
        >
          <Input placeholder="给快递起个名字，如 新键盘" allowClear />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default AddPackageModal;
