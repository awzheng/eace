# Phasors and AC Analysis

When dealing with AC (alternating current) circuits, we use **phasors** to simplify calculations involving sinusoidal signals.

## Why Phasors?

Working with sinusoidal functions directly is mathematically tedious:

```
v(t) = Vm sin(ωt + φ)
```

Phasors convert these time-domain functions into complex numbers, making circuit analysis much simpler.

## What is a Phasor?

A phasor is a complex number that represents the **amplitude** and **phase** of a sinusoidal signal:

$$\mathbf{V} = V_m \angle \phi = V_m e^{j\phi}$$

Where:
- **Vm** = Peak amplitude (magnitude)
- **φ** = Phase angle
- **j** = Imaginary unit (√-1)

## Phasor Notation Forms

| Form | Notation | Example |
|------|----------|---------|
| Polar | V∠θ | 10∠30° |
| Rectangular | a + jb | 8.66 + j5 |
| Exponential | Ve^jθ | 10e^j30° |

## Converting Between Forms

### Polar to Rectangular
```
a = V × cos(θ)
b = V × sin(θ)
```

### Rectangular to Polar
```
V = √(a² + b²)
θ = arctan(b/a)
```

## Impedance

In AC circuits, **impedance** (Z) is the phasor equivalent of resistance:

$$\mathbf{Z} = R + jX$$

Where:
- **R** = Resistance (real part)
- **X** = Reactance (imaginary part)
  - Inductive: X_L = ωL (positive)
  - Capacitive: X_C = -1/(ωC) (negative)

### Impedance of Basic Components

| Component | Impedance |
|-----------|-----------|
| Resistor | Z = R |
| Inductor | Z = jωL |
| Capacitor | Z = 1/(jωC) = -j/(ωC) |

## Ohm's Law in Phasor Form

$$\mathbf{V} = \mathbf{I} \times \mathbf{Z}$$

The same familiar relationship, but with complex numbers!

## Power in AC Circuits

AC power has three components:

1. **Real Power (P)**: Actual power consumed (Watts)
2. **Reactive Power (Q)**: Power stored/returned by inductors and capacitors (VARs)
3. **Apparent Power (S)**: Total power (VA)

$$\mathbf{S} = P + jQ = \mathbf{V} \times \mathbf{I}^*$$

## Key Takeaways

- Phasors simplify AC circuit math by converting sinusoids to complex numbers
- All DC analysis techniques (KVL, KCL, Ohm's Law) work with phasors
- Phase relationships between voltage and current reveal circuit behavior
- Complex impedance captures both resistance and reactance effects

