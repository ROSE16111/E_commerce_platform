# 数据库迁移脚本：添加订单利润字段

## 迁移说明
为 `orders` 表添加 `profit` 字段，用于存储每个订单的利润。

## SQL 迁移语句

```sql
-- 添加 profit 字段
ALTER TABLE orders ADD COLUMN profit DECIMAL(12, 2) NOT NULL DEFAULT 0;

-- 为现有订单计算利润
UPDATE orders 
SET profit = (actual_price * quantity) - (
    SELECT cost_price * quantity 
    FROM products 
    WHERE products.id = orders.product_id
);

-- 添加索引（可选，用于查询优化）
CREATE INDEX idx_orders_profit ON orders(profit);
```

## 迁移步骤

### 重建一个新数据库
`docker compose down -v`
`docker compose up -d db`

-- 检查现有订单的利润是否正确计算
SELECT order_number, actual_price, quantity, profit, 
       (actual_price * quantity) as total_sales,
       (SELECT cost_price * quantity FROM products WHERE products.id = orders.product_id) as total_cost
FROM orders 
LIMIT 5;
```

## 注意事项

1. **数据一致性**：确保所有现有订单的利润都正确计算
2. **性能影响**：profit 字段会占用额外存储空间，但查询性能会提升
3. **业务逻辑**：新创建的订单会自动计算利润，更新的订单会重新计算利润

## 回滚方案

如果需要回滚，可以执行：
```sql
-- 删除 profit 字段
ALTER TABLE orders DROP COLUMN profit;
```
