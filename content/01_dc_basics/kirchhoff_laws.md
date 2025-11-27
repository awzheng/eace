# Kirchhoff's Laws

Gustav Kirchhoff formulated two fundamental laws in 1845 that are essential for analyzing electrical circuits. These laws are based on the conservation of charge and energy.

## Kirchhoff's Current Law (KCL)

> **The algebraic sum of all currents entering and leaving a node must equal zero.**

In simpler terms: *What goes in must come out.*

### Mathematical Expression

$$\sum_{k=1}^{n} I_k = 0$$

Or equivalently:

$$I_{in} = I_{out}$$

### Example

Consider a node where three wires meet:
- Wire 1 carries 5A into the node
- Wire 2 carries 3A into the node
- Wire 3 carries current out of the node

By KCL: `5A + 3A = I₃`

Therefore, `I₃ = 8A` flows out of the node.

## Kirchhoff's Voltage Law (KVL)

> **The algebraic sum of all voltages around any closed loop in a circuit must equal zero.**

In simpler terms: *Energy is conserved around any closed path.*

### Mathematical Expression

$$\sum_{k=1}^{n} V_k = 0$$

### Sign Convention

When traversing a loop:
- **Voltage rise** (- to +): Positive
- **Voltage drop** (+ to -): Negative

### Example

In a simple series circuit with a 12V battery and two resistors:

```
+12V (battery) - 5V (R₁) - 7V (R₂) = 0
```

This confirms that the sum of voltage drops equals the source voltage.

## Applying Both Laws Together

For circuit analysis, we typically:

1. **Identify nodes** and apply KCL to write current equations
2. **Identify loops** and apply KVL to write voltage equations
3. **Solve the system** of equations for unknown values

## Common Mistakes to Avoid

1. **Inconsistent sign conventions**: Always define and stick to one direction for current and voltage
2. **Missing components**: Make sure every element in a loop is accounted for in KVL
3. **Counting currents incorrectly**: In KCL, be careful about current directions

## Practical Applications

- **Mesh Analysis**: Uses KVL systematically
- **Nodal Analysis**: Uses KCL systematically
- **Circuit Simulation**: SPICE uses these laws internally
- **Power Distribution**: Essential for grid analysis

