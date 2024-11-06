\documentclass{article}
\usepackage{amsmath}

\begin{document}

\section{Proof of the Equation}

To prove the equation:
\[
\nabla' \left(\frac{1}{R}\right) = \frac{a}{R^2} \nabla'(R_1) = \frac{R_2}{aR}
\]

\subsection{Assumptions}

\begin{itemize}
\item $R$ is the position vector ($R = \sqrt{x^2 + y^2 + z^2}$)
\item $\nabla'$ is the gradient operator ($\nabla' = \frac{\partial}{\partial x}, \frac{\partial}{\partial y}, \frac{\partial}{\partial z}$)
\item $a$ is a constant
\end{itemize}

\subsection{Derivation}

\subsubsection{Left Side: $\nabla' \left(\frac{1}{R}\right)$}

Using the chain rule:
\[
\nabla' \left(\frac{1}{R}\right) = -\frac{1}{R^2} \nabla'(R)
\]

Expanding $\nabla'(R)$:
\[
\nabla'(R) = \frac{\partial R}{\partial x}, \frac{\partial R}{\partial y}, \frac{\partial R}{\partial z}
\]

\[
= \frac{x}{R}, \frac{y}{R}, \frac{z}{R}
\]

Substituting back:
\[
\nabla' \left(\frac{1}{R}\right) = -\frac{1}{R^2} \left(\frac{x}{R}, \frac{y}{R}, \frac{z}{R}\right)
\]

\[
= -\frac{x}{R^3}, -\frac{y}{R^3}, -\frac{z}{R^3}
\]

\subsubsection{Right Side: $\frac{a}{R^2} \nabla'(R_1) = \frac{R_2}{aR}$}

Using the product rule:
\[
\nabla'(R_1) = \nabla'(R)
\]

\[
= \frac{x}{R}, \frac{y}{R}, \frac{z}{R}
\]

Substituting:
\[
\frac{a}{R^2} \nabla'(R_1) = \frac{a}{R^2} \left(\frac{x}{R}, \frac{y}{R}, \frac{z}{R}\right)
\]

\[
= \frac{ax}{R^3}, \frac{ay}{R^3}, \frac{az}{R^3}
\]

Equating the two expressions:
\[
-\frac{x}{R^3}, -\frac{y}{R^3}, -\frac{z}{R^3} = \frac{ax}{R^3}, \frac{ay}{R^3}, \frac{az}{R^3}
\]

This implies:
\[
a = -1
\]

\subsection{Conclusion}

The equation $\nabla' \left(\frac{1}{R}\right) = \frac{a}{R^2} \nabla'(R_1) = \frac{R_2}{aR}$ is valid when $a = -1$.

\end{document}

